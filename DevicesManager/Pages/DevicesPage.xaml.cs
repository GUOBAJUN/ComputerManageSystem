using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Runtime.InteropServices.WindowsRuntime;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Data;
using Microsoft.UI.Xaml.Input;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using Microsoft.UI.Xaml.Navigation;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.Media.Protection.PlayReady;
using System.Net.Http.Headers;
using System.Threading.Tasks;

// To learn more about WinUI, the WinUI project structure,
// and more about our project templates, see: http://aka.ms/winui-project-info.

namespace DevicesManager.Pages;
/// <summary>
/// An empty page that can be used on its own or navigated to within a Frame.
/// </summary>
public sealed partial class DevicesPage : Page
{
    public ObservableCollection<DeviceDataObject> DataObjects { get; set; }
    public HttpClient httpClient { get; set; }
    public DevicesPage()
    {
        this.InitializeComponent();
        DataObjects = new();
    }


    private void Content_GridView_ItemClick(object sender, ItemClickEventArgs e)
    {
        var item = e.ClickedItem as DeviceDataObject;
        Frame.Navigate(typeof(DetailPage), item.Name);
    }


    protected async override void OnNavigatedTo(NavigationEventArgs e)
    {
        try 
        {
            using HttpResponseMessage response = await (Application.Current as App).httpClient.GetAsync("admin/status_all");
            response.EnsureSuccessStatusCode();
            JObject jsonResponse = JObject.Parse(await response.Content.ReadAsStringAsync());
            DataObjects.Clear();
            foreach (var result in jsonResponse["results"])
            {
                var hostname = result["Hostname"].ToString();
                if (result.Value<int>("live") == 1)
                {
                    DataObjects.Add(new DeviceDataObject(hostname, new Uri("ms-appx:///Assets/DeviceImages/desktop.png"), "Normal", Application.Current.Resources["SuccessIconInfoBadgeStyle"] as Style, true));
                }
                else
                {
                    DataObjects.Add(new DeviceDataObject(hostname, new Uri("ms-appx:///Assets/DeviceImages/desktop.png"), "Normal", Application.Current.Resources["InformationalIconInfoBadgeStyle"] as Style, false));
                }
            }
        }
        catch (Exception ex)
        {
            ContentDialog contentDialog = new ContentDialog();
            contentDialog.XamlRoot = this.XamlRoot;
            contentDialog.Style = Application.Current.Resources["DefaultContentDialogStyle"] as Style;
            contentDialog.Content = ex.Message;
            contentDialog.Title = ex.GetType().Name;
            contentDialog.CloseButtonText = "х╥хо";
            try
            {
                await contentDialog.ShowAsync();
            }
            catch { }
        }
        base.OnNavigatedTo(e);
    }
}

public class DeviceDataObject
{

    public string Name
    {
        get; set;
    }
    public BitmapImage ImageLocation
    {
        get; set;
    }
    public string Status
    {
        get; set;
    }
    public Style BadgeStyle
    {
        get; set;
    }
    public bool IsEnable
    {
        get; set;
    }

    public DeviceDataObject(string name, Uri imageLocation, string status, Style badgeStyle, bool isEnable)
    {
        Name = name;
        ImageLocation = new BitmapImage(imageLocation);
        Status = status;
        BadgeStyle = badgeStyle;
        IsEnable = isEnable;
    }
}
